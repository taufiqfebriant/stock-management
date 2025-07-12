import { Button } from "app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table";
import { sql } from "drizzle-orm";
import { Link } from "react-router";
import { db } from "../db";
import { purchaseOrders } from "../db/schema";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock Management Dashboard" },
    {
      name: "description",
      content: "Manage your inventory and purchase orders",
    },
  ];
}

export async function loader() {
  try {
    const statusCounts = await db
      .select({
        status: purchaseOrders.status,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(purchaseOrders)
      .groupBy(purchaseOrders.status);

    const recent = await db.select().from(purchaseOrders).orderBy(purchaseOrders.createDate).limit(5);

    return { statusCounts, recent };
  } catch (error) {
    return { statusCounts: [], recent: [] };
  }
}

const status = [
  { status: "pending_approval", label: "PENDING APPROVAL" },
  { status: "pending_receive", label: "PENDING RECEIVE" },
  { status: "received", label: "RECEIVED" },
  { status: "rejected", label: "REJECTED" },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { statusCounts, recent } = loaderData;

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Stock Management Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {status.map((statusInfo) => {
          const statusData = statusCounts.find((s) => s.status === statusInfo.status);
          const count = statusData?.count || 0;

          return (
            <Card key={statusInfo.status}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{statusInfo.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Purchase Orders</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Order</CardTitle>
            <CardDescription>Add a new purchase order to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/purchase-orders/create">
              <Button>Create</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>View Purchase Orders</CardTitle>
            <CardDescription>Manage existing purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/purchase-orders">
              <Button>View</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory Lots</CardTitle>
            <CardDescription>View and manage inventory lot numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/inventory-lots">
              <Button>View</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-gray-500">
              No purchase orders found.{" "}
              <Link to="/purchase-orders/create" className="text-blue-600 hover:text-blue-800">
                Create your first purchase order
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.uniqueId}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-800"
                            : po.status === "pending_receive"
                            ? "bg-blue-100 text-blue-800"
                            : po.status === "received"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {po.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(po.createDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link to={`/purchase-orders/${po.id}`}>
                        <Button variant="outline">View</Button>
                      </Link>
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
