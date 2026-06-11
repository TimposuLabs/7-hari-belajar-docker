package com.belajardocker.controller;
 
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
 
import java.time.Instant;
import java.util.Map;
 
@RestController
@RequestMapping("/api")
public class HelloController {
 
    // Nilai ini bisa di-set via environment variable saat docker run
    @Value("${app.version:1.0.0}")
    private String appVersion;
 
    @Value("${spring.profiles.active:default}")
    private String activeProfile;
 
    /**
     * Endpoint sederhana untuk verifikasi container berjalan.
     * Sama seperti /health di Node.js dan Python.
     */
    @GetMapping("/hello")
    public Map<String, Object> hello() {
        return Map.of(
            "pesan",     "Halo dari Spring Boot di Docker!",
            "versi",     appVersion,
            "profil",    activeProfile,
            "timestamp", Instant.now().toString(),
            "java",      System.getProperty("java.version")
        );
    }
 
    /**
     * Endpoint info JVM — berguna untuk verifikasi pengaturan memory
     */
    @GetMapping("/jvm-info")
    public Map<String, Object> jvmInfo() {
        Runtime runtime = Runtime.getRuntime();
        long mb = 1024 * 1024;
        return Map.of(
            "maxMemoryMB",   runtime.maxMemory()   / mb,
            "totalMemoryMB", runtime.totalMemory() / mb,
            "freeMemoryMB",  runtime.freeMemory()  / mb,
            "processors",    runtime.availableProcessors()
        );
    }
}