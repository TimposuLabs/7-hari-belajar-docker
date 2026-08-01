package com.belajardocker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
public class Product {
 
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
 
    @NotBlank(message = "Nama tidak boleh kosong")
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String nama;
 
    @Column(columnDefinition = "TEXT")
    private String deskripsi;
 
    @NotNull(message = "Harga tidak boleh kosong")
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal harga;
 
    @Min(0)
    @Column(nullable = false)
    private Integer stok = 0;
 
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
 
    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}