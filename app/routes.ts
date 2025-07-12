import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/purchase-orders", "routes/purchase-orders/index.tsx"),
  route("/purchase-orders/create", "routes/purchase-orders/create.tsx"),
  route("/purchase-orders/:id", "routes/purchase-orders/detail.tsx"),
  route("/purchase-orders/:id/lots", "routes/purchase-orders/lots.tsx"),
  route("/inventory-lots", "routes/inventory-lots/index.tsx"),
] satisfies RouteConfig;
