package com.cafe.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {

    /** GET /api/health - used by the host (Render) and by the frontend to check the server is up */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "version", "1.1.0");
    }
}