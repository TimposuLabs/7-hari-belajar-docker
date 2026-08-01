package com.belajardocker.controller;

import com.belajardocker.model.Product;
import com.belajardocker.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
 
import java.util.Map;
 
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
 
    private final ProductService svc;
 
    @GetMapping
    public ResponseEntity<?> getAll() {
        var list = svc.findAll();
        return ResponseEntity.ok(
            Map.of("success", true, "total", list.size(), "data", list));
    }
 
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return svc.findById(id)
            .<ResponseEntity<?>>map(p -> ResponseEntity.ok(
                Map.of("success", true, "data", p)))
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false,
                             "error", "Produk tidak ditemukan")));
    }
 
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Product p) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("success", true, "data", svc.save(p)));
    }
 
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Product upd) {
        return svc.update(id, upd)
            .<ResponseEntity<?>>map(p -> ResponseEntity.ok(
                Map.of("success", true, "data", p)))
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false,
                             "error", "Produk tidak ditemukan")));
    }
 
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!svc.delete(id))
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false,
                             "error", "Produk tidak ditemukan"));
        return ResponseEntity.ok(
            Map.of("success", true, "message", "Produk berhasil dihapus"));
    }
 
    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String nama) {
        return ResponseEntity.ok(
            Map.of("success", true, "data", svc.search(nama)));
    }
}