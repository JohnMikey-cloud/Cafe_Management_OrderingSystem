package com.cafe.web;

import com.cafe.model.CafeOrder;
import com.cafe.model.MenuItem;
import com.cafe.model.OrderLine;
import com.cafe.repo.CafeOrderRepository;
import com.cafe.repo.MenuItemRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final CafeOrderRepository orderRepo;
    private final MenuItemRepository menuRepo;

    public OrderController(CafeOrderRepository orderRepo, MenuItemRepository menuRepo) {
        this.orderRepo = orderRepo;
        this.menuRepo = menuRepo;
    }

    /** GET /api/orders - newest first */
    @GetMapping
    public List<CafeOrder> list() {
        return orderRepo.findAllByOrderByCreatedAtDesc();
    }

    /** POST /api/orders - place a new order. Prices come from the DB, not the client. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CafeOrder create(@Valid @RequestBody CafeOrder order) {
        double total = 0;
        for (OrderLine line : order.getItems()) {
            MenuItem item = menuRepo.findById(line.getMenuItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Unknown menu item id: " + line.getMenuItemId()));
            if (!item.isAvailable()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        item.getName() + " is currently unavailable");
            }
            line.setItemName(item.getName());
            line.setUnitPrice(item.getPrice());
            total += item.getPrice() * line.getQuantity();
        }
        order.setId(null);
        order.setStatus(CafeOrder.Status.PENDING);
        order.setCreatedAt(LocalDateTime.now());
        order.setTotal(Math.round(total * 100.0) / 100.0);
        return orderRepo.save(order);
    }

    /** PATCH /api/orders/{id}/status  body: {"status":"PREPARING"} */
    @PatchMapping("/{id}/status")
    public CafeOrder updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        CafeOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        try {
            order.setStatus(CafeOrder.Status.valueOf(String.valueOf(body.get("status")).toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "status must be one of PENDING, PREPARING, READY, COMPLETED, CANCELLED");
        }
        return orderRepo.save(order);
    }
}