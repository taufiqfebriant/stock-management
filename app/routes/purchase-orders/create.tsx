import { isValidationErrorResponse, parseFormData, useForm, validationError } from "@rvf/react-router";
import { ErrorMessage } from "app/components/ErrorMessage";
import { Button } from "app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { Link, redirect, useActionData } from "react-router";
import { z } from "zod";
import { db } from "../../db";
import { purchaseOrderItems, purchaseOrders } from "../../db/schema";
import type { Route } from "./+types/create";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Create Purchase Order" }, { name: "description", content: "Create a new purchase order" }];
}

const itemSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  name: z.string().min(1, "Item name is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Quantity must be a positive number",
    }),
});

const schema = z.object({
  uniqueId: z.string().min(1, "Purchase Order ID is required"),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

export async function action({ request }: Route.ActionArgs) {
  const result = await parseFormData(request, schema);
  if (result.error) return validationError(result.error);

  const { uniqueId, items } = result.data;

  try {
    const [purchaseOrder] = await db
      .insert(purchaseOrders)
      .values({
        uniqueId,
        status: "pending_approval",
      })
      .returning();

    const itemsToInsert = items.map((item) => ({
      purchaseOrderId: purchaseOrder.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: parseInt(item.quantity),
    }));

    await db.insert(purchaseOrderItems).values(itemsToInsert);

    return redirect(`/purchase-orders/${purchaseOrder.id}`);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return { error: "Failed to create purchase order" };
  }
}

export default function CreatePurchaseOrder() {
  const data = useActionData<typeof action>();
  const generateUniqueId = () => {
    return `PO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  };

  const form = useForm({
    schema,
    defaultValues: {
      uniqueId: generateUniqueId(),
      items: [{ code: "", name: "", quantity: "" }],
    },
    method: "POST",
  });

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          {!isValidationErrorResponse(data) && data?.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{data.error}</div>
          )}

          <form {...form.getFormProps()} className="space-y-6">
            <div>
              <Label htmlFor="uniqueId">Purchase Order ID</Label>
              <Input
                id="uniqueId"
                placeholder="e.g., PO-2024-001"
                className="mt-2"
                {...form.getInputProps("uniqueId")}
              />
              {form.error("uniqueId") && <ErrorMessage>{form.error("uniqueId")}</ErrorMessage>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Items</h3>
                <Button type="button" onClick={() => form.array("items").push({ code: "", name: "", quantity: "" })}>
                  Add Item
                </Button>
              </div>

              {form.error("items") && <ErrorMessage>{form.error("items")}</ErrorMessage>}

              <div className="space-y-4">
                {form.array("items").map((key, item, index) => (
                  <Card key={key}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Item {index + 1}</CardTitle>
                        {form.array("items").length() > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => form.array("items").remove(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Item Code</Label>
                          <Input placeholder="e.g., ITM001" className="mt-2" {...item.getInputProps("code")} />
                          {item.error("code") && <ErrorMessage>{item.error("code")}</ErrorMessage>}
                        </div>

                        <div>
                          <Label>Item Name</Label>
                          <Input placeholder="e.g., Widget A" className="mt-2" {...item.getInputProps("name")} />
                          {item.error("name") && <ErrorMessage>{item.error("name")}</ErrorMessage>}
                        </div>

                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 100"
                            className="mt-2"
                            {...item.getInputProps("quantity")}
                          />
                          {item.error("quantity") && <ErrorMessage>{item.error("quantity")}</ErrorMessage>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link to="/purchase-orders">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Purchase Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
