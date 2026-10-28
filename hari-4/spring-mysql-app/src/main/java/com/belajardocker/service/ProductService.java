package com.belajardocker.service;

import com.belajardocker.model.Product;
import com.belajardocker.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<Product> findAll() {
        return repository.findAll();
    }

    public Optional<Product> findById(Long id) {
        return repository.findById(id);
    }

    public Product save(Product product) {
        return repository.save(product);
    }

    public Optional<Product> update(Long id, Product updated) {
        return repository.findById(id).map(existing -> {
            if (updated.getNama()  != null) existing.setNama(updated.getNama());
            if (updated.getHarga() != null) existing.setHarga(updated.getHarga());
            if (updated.getStok()  != null) existing.setStok(updated.getStok());
            return repository.save(existing);
        });
    }

    public boolean delete(Long id) {
        if (!repository.existsById(id)) return false;
        repository.deleteById(id);
        return true;
    }

    public List<Product> searchByName(String nama) {
        return repository.findByNamaContainingIgnoreCase(nama);
    }

    public List<Product> findLowStock(int threshold) {
        return repository.findLowStockProducts(threshold);
    }

    public void seedData() {
        if (repository.count() == 0) {
            repository.saveAll(List.of(
                create("Laptop Pro X",        new BigDecimal("18500000"), 10),
                create("Mechanical Keyboard", new BigDecimal("850000"),   25),
                create("Mouse Wireless",      new BigDecimal("320000"),   50),
                create("Monitor 27\" 4K",     new BigDecimal("5200000"),   8),
                create("USB-C Hub 7-in-1",    new BigDecimal("450000"),   30)
            ));
        }
    }

    private Product create(String nama, BigDecimal harga, int stok) {
        Product p = new Product();
        p.setNama(nama);
        p.setHarga(harga);
        p.setStok(stok);
        return p;
    }
}
