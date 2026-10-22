package com.cafe.model;

import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** One line of an order, e.g. "2 x Latte". Stored inside the order. */
@Embeddable
public class OrderLine {

    @NotNull
    private Long menuItemId;

    private String itemName;

    private double unitPrice;

    @Min(1)
    private int quantity;

    public OrderLine() {}

    public Long getMenuItemId() { return menuItemId; }
    public void setMenuItemId(Long menuItemId) { this.menuItemId = menuItemId; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}