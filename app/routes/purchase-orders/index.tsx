import { Button } from "app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "app/components/ui/table";
import type { Route } from "./+types/index";
import { Link } from "react-router";
import { db } from "../../db";
import { purchaseOrders } from "../../db/schema";
import { desc } from "drizzle-orm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Purchase Orders" },
    { name: "description", content: "View all purchase orders" },
  ];
}

export async function loader() {
  try {
    const orders = await db
      .select({
        id: purchaseOrders.id,
        uniqueId: purchaseOrders.uniqueId,
        createDate: purchaseOrders.createDate,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.createDate));

    return { orders };
  } catch (error) {
    console.error("Error loading purchase orders:", error);
    return { orders: [] };
  }
}

const statusColors = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  pending_receive: "bg-blue-100 text-blue-800",
  received: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function PurchaseOrdersIndex({
  loaderData,
}: Route.ComponentProps) {
  const { orders } = loaderData;

  return (
    <div className="max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Purchase Orders</CardTitle>
            <Link to="/purchase-orders/create">
              <Button>Create Purchase Order</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No purchase orders
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new purchase order.
              </p>
              <div className="mt-6">
                <Link to="/purchase-orders/create">
                  <Button>Create Purchase Order</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purchase Order ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.uniqueId}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-x-2">
                        <Link to={`/purchase-orders/${order.id}`}>
                          <Button variant="outline">View</Button>
                        </Link>
                        {order.status === "pending_receive" && (
                          <Link to={`/purchase-orders/${order.id}/lots`}>
                            <Button variant="outline">Add Lots</Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
