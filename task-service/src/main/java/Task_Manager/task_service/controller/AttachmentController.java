package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
@RequiredArgsConstructor
@Slf4j
public class AttachmentController {

    private final AttachmentService attachmentService;

    private boolean checkIsSystemAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(auth -> "SYS_AD".equalsIgnoreCase(auth.getAuthority())
                        || "ROLE_SYS_AD".equalsIgnoreCase(auth.getAuthority()));
    }

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> getAttachments(@PathVariable UUID taskId) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByTaskId(taskId));
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<AttachmentResponse> getAttachmentById(@PathVariable UUID attachmentId) {
        return ResponseEntity.ok(attachmentService.getAttachmentById(attachmentId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentResponse> uploadAttachment(
            @PathVariable UUID taskId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {

        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);

        AttachmentResponse response = attachmentService.uploadAttachment(taskId, userId, file, isSystemAdmin);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{attachmentId}/view")
    public ResponseEntity<byte[]> viewOrDownloadAttachment(
            @PathVariable UUID taskId,
            @PathVariable UUID attachmentId,
            @RequestParam(value = "download", defaultValue = "false") boolean isDownload) throws IOException {

        AttachmentResponse metadata = attachmentService.getAttachmentById(attachmentId);
        byte[] fileBytes = attachmentService.getAttachmentBytes(attachmentId);

        String dispositionType = isDownload ? "attachment" : "inline";
        String encodedFileName = URLEncoder.encode(metadata.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, dispositionType + "; filename=\"" + encodedFileName + "\"")
                .contentType(MediaType.parseMediaType(metadata.getFileType()))
                .contentLength(metadata.getFileSize())
                .body(fileBytes);
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID attachmentId,
            Authentication authentication) {

        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);

        attachmentService.deleteAttachment(attachmentId, userId, isSystemAdmin);
        return ResponseEntity.noContent().build();
    }
}