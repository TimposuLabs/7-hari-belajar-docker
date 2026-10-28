package com.belajardocker.controller;

import com.belajardocker.model.Product;
import com.belajardocker.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    private static ResponseEntity<Map<String, Object>> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("success", false, "error", "Produk tidak ditemukan"));
    }

    // GET /api/products
    @GetMapping
    public Map<String, Object> getAll() {
        List<Product> products = service.findAll();
        return Map.of("success", true, "total", products.size(), "data", products);
    }

    // GET /api/products/search?nama=kata
    @GetMapping("/search")
    public Map<String, Object> search(@RequestParam String nama) {
        return Map.of("success", true, "data", service.searchByName(nama));
    }

    // GET /api/products/low-stock?threshold=10
    @GetMapping("/low-stock")
    public Map<String, Object> lowStock(@RequestParam(defaultValue = "10") int threshold) {
        return Map.of("success", true, "data", service.findLowStock(threshold));
    }

    // GET /api/products/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(p -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", p)))
            .orElseGet(ProductController::notFound);
    }

    // POST /api/products
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody Product product) {
        Product saved = service.save(product);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("success", true, "data", saved));
    }

    // PUT /api/products/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                      @RequestBody Product updated) {
        return service.update(id, updated)
            .map(p -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", p)))
            .orElseGet(ProductController::notFound);
    }

    // DELETE /api/products/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        if (!service.delete(id)) return notFound();
        return ResponseEntity.ok(Map.of("success", true, "message", "Produk berhasil dihapus"));
    }
}
