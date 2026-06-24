package com.doan.reviewhub.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class ReviewImageUploadController {

    /*
     * Nếu backend chạy từ thư mục backend/reviewhub:
     * ../../frontend/public sẽ trỏ về frontend/public ở gốc project.
     *
     * Nếu vẫn chưa đúng, thêm dòng này vào application.properties:
     * reviewhub.upload.frontend-public=C:/reviewhub-api-platform2-master/frontend/public
     */
    @Value("${reviewhub.upload.frontend-public:../../frontend/public}")
    private String frontendPublicRoot;

    @PostMapping(
            value = {
                    "/api/reviews/{reviewId}/image",
                    "/api/partner/reviews/{reviewId}/image"
            },
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, Object>> uploadReviewImage(
            @PathVariable String reviewId,
            @RequestPart("file") MultipartFile file,
            @RequestParam("operatorCode") String operatorCode,
            @RequestParam("categoryFolder") String categoryFolder,
            @RequestParam("imageFileName") String imageFileName
    ) throws IOException {
        return saveImage(reviewId, file, operatorCode, categoryFolder, imageFileName);
    }

    @PostMapping(
            value = "/api/review-images/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, Object>> uploadReviewImageNoPath(
            @RequestPart("file") MultipartFile file,
            @RequestParam("reviewId") String reviewId,
            @RequestParam("operatorCode") String operatorCode,
            @RequestParam("categoryFolder") String categoryFolder,
            @RequestParam("imageFileName") String imageFileName
    ) throws IOException {
        return saveImage(reviewId, file, operatorCode, categoryFolder, imageFileName);
    }

    private ResponseEntity<Map<String, Object>> saveImage(
            String reviewId,
            MultipartFile file,
            String operatorCode,
            String categoryFolder,
            String imageFileName
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "File ảnh rỗng."
            ));
        }

        String safeOperatorCode = sanitizePathPart(operatorCode);
        String safeCategoryFolder = sanitizePathPart(categoryFolder);
        String safeImageFileName = sanitizeFileName(imageFileName);

        if (!safeImageFileName.toLowerCase(Locale.ROOT).endsWith(".webp")) {
            safeImageFileName = safeImageFileName + ".webp";
        }

        Path publicRoot = Path.of(frontendPublicRoot).toAbsolutePath().normalize();

        Path outputDir = publicRoot
                .resolve("anhdanggia")
                .resolve(safeCategoryFolder)
                .resolve(safeOperatorCode)
                .normalize();

        Files.createDirectories(outputDir);

        Path outputPath = outputDir
                .resolve(safeImageFileName)
                .normalize();

        if (!outputPath.startsWith(outputDir)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Đường dẫn ảnh không hợp lệ."
            ));
        }

        file.transferTo(outputPath.toFile());

        String imageUrl = "/anhdanggia/"
                + safeCategoryFolder
                + "/"
                + safeOperatorCode
                + "/"
                + safeImageFileName;

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Upload ảnh review thành công.");
        body.put("reviewId", reviewId);
        body.put("operatorCode", safeOperatorCode);
        body.put("categoryFolder", safeCategoryFolder);
        body.put("imageFileName", safeImageFileName);
        body.put("imageUrl", imageUrl);
        body.put("savedPath", outputPath.toString());

        return ResponseEntity.ok(body);
    }

    private String sanitizePathPart(String value) {
        String text = StringUtils.hasText(value) ? value.trim() : "unknown";

        text = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        text = text.replaceAll("[^A-Za-z0-9_-]", "");

        return text.isBlank() ? "unknown" : text;
    }

    private String sanitizeFileName(String value) {
        String text = StringUtils.hasText(value) ? value.trim() : "image.webp";

        text = text.replace("\\", "/");

        int slashIndex = text.lastIndexOf("/");
        if (slashIndex >= 0) {
            text = text.substring(slashIndex + 1);
        }

        text = text.replaceAll("[^A-Za-z0-9_.-]", "");

        return text.isBlank() ? "image.webp" : text;
    }
}
