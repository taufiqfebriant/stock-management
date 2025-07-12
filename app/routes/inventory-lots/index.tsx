import { desc, eq } from "drizzle-orm";
import { Link } from "react-router";
import { db } from "../../db";
import type { PurchaseOrderStatus } from "../../db/schema";
import { inventoryLots, purchaseOrderItems, purchaseOrders } from "../../db/schema";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Inventory Lots" }, { name: "description", content: "View all inventory lot numbers" }];
}

export async function loader() {
  try {
    const lots = await db
      .select({
        id: inventoryLots.id,
        lotNumber: inventoryLots.lotNumber,
        quantity: inventoryLots.quantity,
        itemCode: purchaseOrderItems.itemCode,
        itemName: purchaseOrderItems.itemName,
        purchaseOrderId: purchaseOrders.id,
        purchaseOrderUniqueId: purchaseOrders.uniqueId,
        purchaseOrderStatus: purchaseOrders.status,
        createDate: purchaseOrders.createDate,
      })
      .from(inventoryLots)
      .innerJoin(purchaseOrderItems, eq(inventoryLots.purchaseOrderItemId, purchaseOrderItems.id))
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .orderBy(desc(purchaseOrders.createDate), inventoryLots.lotNumber);

    return { lots };
  } catch (error) {
    console.error("Error loading inventory lots:", error);
    return { lots: [] };
  }
}

const statusColors: Record<PurchaseOrderStatus, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  pending_receive: "bg-blue-100 text-blue-800",
  received: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function InventoryLotsIndex({ loaderData }: Route.ComponentProps) {
  const { lots } = loaderData;

  const lotsByPO = lots.reduce((acc, lot) => {
    const key = lot.purchaseOrderUniqueId;
    if (!acc[key]) {
      acc[key] = {
        purchaseOrder: {
          id: lot.purchaseOrderId,
          uniqueId: lot.purchaseOrderUniqueId,
          status: lot.purchaseOrderStatus,
          createDate: lot.createDate,
        },
        lots: [],
      };
    }
    acc[key].lots.push(lot);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Inventory Lots</h1>
            <div className="text-sm text-gray-500">Total lots: {lots.length}</div>
          </div>

          {lots.length === 0 ? (
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory lots</h3>
              <p className="mt-1 text-sm text-gray-500">
                Inventory lots will appear here once purchase orders are received.
              </p>
              <div className="mt-6">
                <Link
                  to="/purchase-orders/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Purchase Order
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.values(lotsByPO).map((poGroup: any) => (
                <div key={poGroup.purchaseOrder.uniqueId} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Purchase Order: {poGroup.purchaseOrder.uniqueId}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(poGroup.purchaseOrder.createDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            statusColors[poGroup.purchaseOrder.status as PurchaseOrderStatus] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {poGroup.purchaseOrder.status.replace("_", " ")}
                        </span>
                        <Link
                          to={`/purchase-orders/${poGroup.purchaseOrder.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View PO
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lot Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {poGroup.lots.map((lot: any) => (
                          <tr key={lot.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {lot.lotNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lot.itemCode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lot.itemName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lot.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lots.length > 0 && (
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Lots:</span>
                  <span className="ml-2 font-medium">{lots.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Quantity:</span>
                  <span className="ml-2 font-medium">{lots.reduce((sum, lot) => sum + lot.quantity, 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Unique Items:</span>
                  <span className="ml-2 font-medium">{new Set(lots.map((lot) => lot.itemCode)).size}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
