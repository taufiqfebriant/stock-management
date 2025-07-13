import { Button } from "app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "app/components/ui/card";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { Link, redirect, useFetcher } from "react-router";
import { db } from "../../db";
import { inventoryLots, purchaseOrderItems, purchaseOrders } from "../../db/schema";
import type { Route } from "./+types/lots";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Inventory Lots - PO ${params.id}` },
    { name: "description", content: "Enter inventory lot numbers" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const id = parseInt(params.id);

  try {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));

    if (!order) {
      throw new Response("Purchase order not found", { status: 404 });
    }

    if (order.status !== "pending_receive") {
      throw new Response("Cannot enter lot numbers for this purchase order status", { status: 400 });
    }

    const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

    const itemsWithLots = await Promise.all(
      items.map(async (item) => {
        const lots = await db.select().from(inventoryLots).where(eq(inventoryLots.purchaseOrderItemId, item.id));

        return { ...item, lots };
      })
    );

    return { order, items: itemsWithLots };
  } catch (error) {
    console.error("Error loading purchase order:", error);
    throw new Response("Failed to load purchase order", { status: 500 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const lotsData = formData.get("lots") as string;
  const id = parseInt(params.id);

  if (!lotsData) {
    return { error: "Missing lot data" };
  }

  try {
    const lots = JSON.parse(lotsData);

    const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

    for (const item of items) {
      await db.delete(inventoryLots).where(eq(inventoryLots.purchaseOrderItemId, item.id));
    }

    for (const itemId in lots) {
      const itemLots = lots[itemId];
      if (itemLots && itemLots.length > 0) {
        const lotsToInsert = itemLots
          .filter((lot: any) => lot.lotNumber && lot.quantity > 0)
          .map((lot: any) => ({
            purchaseOrderItemId: parseInt(itemId),
            lotNumber: lot.lotNumber,
            quantity: parseInt(lot.quantity),
          }));

        if (lotsToInsert.length > 0) {
          await db.insert(inventoryLots).values(lotsToInsert);
        }
      }
    }

    return redirect(`/purchase-orders/${id}`);
  } catch (error) {
    console.error("Error saving lots:", error);
    return { error: "Failed to save lot numbers" };
  }
}

interface Lot {
  lotNumber: string;
  quantity: string;
}

export default function InventoryLots({ loaderData, actionData }: Route.ComponentProps) {
  const { order, items } = loaderData;
  const fetcher = useFetcher();

  const [lots, setLots] = useState<Record<number, Lot[]>>(() => {
    const initialLots: Record<number, Lot[]> = {};
    items.forEach((item) => {
      if (item.lots.length > 0) {
        initialLots[item.id] = item.lots.map((lot) => ({
          lotNumber: lot.lotNumber,
          quantity: lot.quantity.toString(),
        }));
      } else {
        initialLots[item.id] = [{ lotNumber: "", quantity: "" }];
      }
    });
    return initialLots;
  });

  const addLot = (itemId: number) => {
    setLots((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { lotNumber: "", quantity: "" }],
    }));
  };

  const removeLot = (itemId: number, lotIndex: number) => {
    setLots((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, index) => index !== lotIndex),
    }));
  };

  const updateLot = (itemId: number, lotIndex: number, field: keyof Lot, value: string) => {
    setLots((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((lot, index) => (index === lotIndex ? { ...lot, [field]: value } : lot)),
    }));
  };

  const getTotalLotQuantity = (itemId: number) => {
    return (lots[itemId] || []).reduce((sum, lot) => sum + (parseInt(lot.quantity) || 0), 0);
  };

  const validateQuantities = () => {
    const errors: string[] = [];
    items.forEach((item) => {
      const totalLotQuantity = getTotalLotQuantity(item.id);
      if (totalLotQuantity !== item.quantity) {
        errors.push(
          `${item.itemName}: lot quantities (${totalLotQuantity}) must equal purchase quantity (${item.quantity})`
        );
      }
    });
    return errors;
  };

  const validationErrors = validateQuantities();
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Enter Inventory Lot Numbers</CardTitle>
          <CardDescription>Purchase Order: {order.uniqueId}</CardDescription>
        </CardHeader>
        <CardContent>
          {actionData?.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <h4 className="font-medium">Quantity Validation Errors:</h4>
              <ul className="mt-1 list-disc list-inside text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <fetcher.Form method="post" className="space-y-8">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {item.itemName} ({item.itemCode})
                      </CardTitle>
                      <CardDescription>
                        Required Quantity: {item.quantity} | Current Lot Total: {getTotalLotQuantity(item.id)} |
                        <span
                          className={`ml-1 ${
                            getTotalLotQuantity(item.id) === item.quantity ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {getTotalLotQuantity(item.id) === item.quantity ? "✓ Complete" : "⚠️ Incomplete"}
                        </span>
                      </CardDescription>
                    </div>
                    <Button type="button" onClick={() => addLot(item.id)} size="sm" disabled={isSubmitting}>
                      Add Lot
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(lots[item.id] || []).map((lot, lotIndex) => (
                      <div key={lotIndex} className="flex space-x-4 items-end">
                        <div className="flex-1">
                          <Label>Lot Number</Label>
                          <Input
                            type="text"
                            value={lot.lotNumber}
                            onChange={(e) => updateLot(item.id, lotIndex, "lotNumber", e.target.value)}
                            placeholder="e.g., LOT-2024-001"
                            className="mt-2"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-32">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={lot.quantity}
                            onChange={(e) => updateLot(item.id, lotIndex, "quantity", e.target.value)}
                            min="0"
                            placeholder="0"
                            className="mt-2"
                            disabled={isSubmitting}
                          />
                        </div>
                        {(lots[item.id] || []).length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeLot(item.id, lotIndex)}
                            disabled={isSubmitting}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <input type="hidden" name="lots" value={JSON.stringify(lots)} />

            <div className="flex justify-end space-x-3">
              <Link to={`/purchase-orders/${order.id}`}>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Lot Numbers"}
              </Button>
            </div>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
