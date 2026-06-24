package com.doan.reviewhub.controller;

import com.doan.reviewhub.service.OpenAIAdvisorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIAdvisorController {

    private final OpenAIAdvisorService service;

    public AIAdvisorController(OpenAIAdvisorService service) {
        this.service = service;
    }

    @PostMapping("/advisor")
    public ResponseEntity<String> advisor(@RequestBody Map<String, String> body) {
        try {
            String message = body.getOrDefault("message", "");
            String result = service.advise(message);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity
                    .status(500)
                    .body("BACKEND ERROR: " + e.getMessage());
        }
    }
}