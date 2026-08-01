package com.belajardocker.service;

import com.belajardocker.model.Product;
import com.belajardocker.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
 
@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {
 
    private final ProductRepository repo;
 
    public List<Product>     findAll()           { return repo.findAll(); }
    public Optional<Product> findById(Long id)   { return repo.findById(id); }
    public Product           save(Product p)     { return repo.save(p); }
    public List<Product>     search(String nama) {
        return repo.findByNamaContainingIgnoreCase(nama);
    }
 
    public Optional<Product> update(Long id, Product upd) {
        return repo.findById(id).map(ex -> {
            if (upd.getNama()      != null) ex.setNama(upd.getNama());
            if (upd.getDeskripsi() != null) ex.setDeskripsi(upd.getDeskripsi());
            if (upd.getHarga()     != null) ex.setHarga(upd.getHarga());
            if (upd.getStok()      != null) ex.setStok(upd.getStok());
            return repo.save(ex);
        });
    }
 
    public boolean delete(Long id) {
        if (!repo.existsById(id)) return false;
        repo.deleteById(id);
        return true;
    }
 
    public void seedIfEmpty() {
        if (repo.count() > 0) return;
        List<Product> seeds = List.of(
            build("Laptop Pro X",       "Laptop high-end", new BigDecimal("18500000"), 10),
            build("Keyboard Mechanical","Switch Cherry MX",new BigDecimal("850000"),   25),
            build("Mouse Wireless",     "Mouse ergonomis", new BigDecimal("320000"),   50)
        );
        repo.saveAll(seeds);
        System.out.println("[DB] Seed data berhasil: " + seeds.size() + " produk");
    }
 
    private Product build(String nama, String deskripsi,
                          BigDecimal harga, int stok) {
        Product p = new Product();
        p.setNama(nama); p.setDeskripsi(deskripsi);
        p.setHarga(harga); p.setStok(stok);
        return p;
    }
}