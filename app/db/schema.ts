import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'pending_approval',
  'pending_receive', 
  'received',
  'rejected'
]);

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  uniqueId: text('unique_id').notNull().unique(),
  createDate: timestamp('create_date').notNull().defaultNow(),
  status: purchaseOrderStatusEnum('status').notNull().default('pending_approval'),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
});

export const inventoryLots = pgTable('inventory_lots', {
  id: serial('id').primaryKey(),
  purchaseOrderItemId: integer('purchase_order_item_id').notNull().references(() => purchaseOrderItems.id, { onDelete: 'cascade' }),
  lotNumber: text('lot_number').notNull(),
  quantity: integer('quantity').notNull(),
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ many }) => ({
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  inventoryLots: many(inventoryLots),
}));

export const inventoryLotsRelations = relations(inventoryLots, ({ one }) => ({
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [inventoryLots.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
}));

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type InventoryLot = typeof inventoryLots.$inferSelect;
export type NewInventoryLot = typeof inventoryLots.$inferInsert;
export type PurchaseOrderStatus = 'pending_approval' | 'pending_receive' | 'received' | 'rejected';
