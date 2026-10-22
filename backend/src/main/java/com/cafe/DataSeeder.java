package com.cafe;

import com.cafe.model.MenuItem;
import com.cafe.repo.MenuItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Adds a starter menu the first time the app runs. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final MenuItemRepository menuRepo;

    public DataSeeder(MenuItemRepository menuRepo) {
        this.menuRepo = menuRepo;
    }

    @Override
    public void run(String... args) {
        if (menuRepo.count() > 0) return;
        menuRepo.save(new MenuItem("Espresso", "Coffee", 80));
        menuRepo.save(new MenuItem("Americano", "Coffee", 95));
        menuRepo.save(new MenuItem("Cafe Latte", "Coffee", 120));
        menuRepo.save(new MenuItem("Caramel Macchiato", "Coffee", 140));
        menuRepo.save(new MenuItem("Iced Matcha Latte", "Non-Coffee", 130));
        menuRepo.save(new MenuItem("Hot Chocolate", "Non-Coffee", 110));
        menuRepo.save(new MenuItem("Blueberry Muffin", "Pastry", 75));
        menuRepo.save(new MenuItem("Butter Croissant", "Pastry", 85));
    }
}