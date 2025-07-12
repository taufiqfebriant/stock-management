import { Button } from "app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table";
import { eq } from "drizzle-orm";
import { Form, Link, redirect } from "react-router";
import { Badge } from "../../components/ui/badge";
import { db } from "../../db";
import { inventoryLots, purchaseOrderItems, purchaseOrders } from "../../db/schema";
import type { Route } from "./+types/detail";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Purchase Order ${params.id}` }, { name: "description", content: "Purchase order details" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const id = parseInt(params.id);

  try {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));

    if (!order) {
      throw new Response("Purchase order not found", { status: 404 });
    }

    const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

    const itemsWithLots = await Promise.all(
      items.map(async (item) => {
        const lots = await db.select().from(inventoryLots).where(eq(inventoryLots.purchaseOrderItemId, item.id));

        const totalLotQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);

        return {
          ...item,
          lots,
          totalLotQuantity,
          quantityMatches: totalLotQuantity === item.quantity,
        };
      })
    );

    const allQuantitiesMatch = itemsWithLots.every((item) => item.quantityMatches);
    const hasLots = itemsWithLots.some((item) => item.lots.length > 0);

    return {
      order,
      items: itemsWithLots,
      allQuantitiesMatch,
      hasLots,
    };
  } catch (error) {
    console.error("Error loading purchase order:", error);
    throw new Response("Failed to load purchase order", { status: 500 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const id = parseInt(params.id);

  try {
    let newStatus: string;

    switch (action) {
      case "approve":
        newStatus = "pending_receive";
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "mark_received":
        const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

        for (const item of items) {
          const lots = await db.select().from(inventoryLots).where(eq(inventoryLots.purchaseOrderItemId, item.id));

          const totalLotQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);

          if (totalLotQuantity !== item.quantity) {
            return {
              error: `Item "${item.itemName}" lot quantities (${totalLotQuantity}) don't match the purchase order quantity (${item.quantity}). Please enter the correct lot numbers first.`,
            };
          }
        }

        newStatus = "received";
        break;
      default:
        return { error: "Invalid action" };
    }

    await db
      .update(purchaseOrders)
      .set({ status: newStatus as any })
      .where(eq(purchaseOrders.id, id));

    return redirect(`/purchase-orders/${id}`);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return { error: "Failed to update purchase order status" };
  }
}

export default function PurchaseOrderDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { order, items, allQuantitiesMatch, hasLots } = loaderData;

  const canApprove = order.status === "pending_approval";
  const canReject = order.status === "pending_approval";
  const canMarkReceived = order.status === "pending_receive" && allQuantitiesMatch && hasLots;

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Purchase Order {order.uniqueId}</CardTitle>
              <CardDescription>Created on {new Date(order.createDate).toLocaleDateString()}</CardDescription>
            </div>
            <Badge
              variant={
                order.status === "pending_approval"
                  ? "secondary"
                  : order.status === "pending_receive"
                  ? "secondary"
                  : order.status === "received"
                  ? "default"
                  : "destructive"
              }
            >
              {order.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {actionData?.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          {(canApprove || canReject || canMarkReceived) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Available Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-3">
                  {canApprove && (
                    <Form method="post" className="inline">
                      <input type="hidden" name="action" value="approve" />
                      <Button type="submit">Approve</Button>
                    </Form>
                  )}
                  {canReject && (
                    <Form method="post" className="inline">
                      <input type="hidden" name="action" value="reject" />
                      <Button type="submit" variant="destructive">
                        Reject
                      </Button>
                    </Form>
                  )}
                  {canMarkReceived && (
                    <Form method="post" className="inline">
                      <input type="hidden" name="action" value="mark_received" />
                      <Button type="submit">Mark as Received</Button>
                    </Form>
                  )}
                  {order.status === "pending_receive" && (
                    <Link to={`/purchase-orders/${order.id}/lots`}>
                      <Button variant="outline">Enter Lot Numbers</Button>
                    </Link>
                  )}
                </div>

                {order.status === "pending_receive" && !allQuantitiesMatch && hasLots && (
                  <p className="mt-2 text-sm text-amber-700">
                    ⚠️ Some items have lot quantities that don't match the purchase order quantities. Please correct the
                    lot numbers before marking as received.
                  </p>
                )}

                {order.status === "pending_receive" && !hasLots && (
                  <p className="mt-2 text-sm text-amber-700">
                    ⚠️ No lot numbers have been entered yet. Please enter lot numbers before marking as received.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Lot Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemCode}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.totalLotQuantity || 0}</TableCell>
                      <TableCell>
                        {item.lots.length === 0 ? (
                          <Badge variant="secondary">No lots</Badge>
                        ) : item.quantityMatches ? (
                          <Badge>✓ Complete</Badge>
                        ) : (
                          <Badge variant="destructive">⚠️ Mismatch</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-between">
            <Link to="/purchase-orders">
              <Button variant="link">← Back to Purchase Orders</Button>
            </Link>

            {order.status === "pending_receive" && (
              <Link to={`/purchase-orders/${order.id}/lots`}>
                <Button variant="link">View/Edit Lot Numbers →</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
