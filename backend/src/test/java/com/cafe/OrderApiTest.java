package com.cafe;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:testdb")
@AutoConfigureMockMvc
class OrderApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    void getMenuReturnsSeededItems() throws Exception {
        mvc.perform(get("/api/menu"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].name").exists());
    }

    @Test
    void postOrderComputesTotalFromDatabasePrices() throws Exception {
        String body = """
            {"customerName":"Ana","items":[{"menuItemId":1,"quantity":2}]}
            """;
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(body))
           .andExpect(status().isCreated())
           .andExpect(jsonPath("$.total").value(160.0))
           .andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(get("/api/orders"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].customerName").value("Ana"));
    }

    @Test
    void postOrderWithoutNameIsRejected() throws Exception {
        String body = """
            {"customerName":"","items":[{"menuItemId":1,"quantity":1}]}
            """;
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(body))
           .andExpect(status().isBadRequest());
    }
}