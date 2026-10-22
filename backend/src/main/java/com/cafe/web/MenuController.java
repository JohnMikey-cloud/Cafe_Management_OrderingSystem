package com.cafe.web;

import com.cafe.model.MenuItem;
import com.cafe.repo.MenuItemRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuItemRepository menuRepo;

    public MenuController(MenuItemRepository menuRepo) {
        this.menuRepo = menuRepo;
    }

    /** GET /api/menu - list all menu items */
    @GetMapping
    public List<MenuItem> list() {
        return menuRepo.findAll();
    }

    /** POST /api/menu - add a menu item */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItem create(@Valid @RequestBody MenuItem item) {
        item.setId(null);
        return menuRepo.save(item);
    }
}