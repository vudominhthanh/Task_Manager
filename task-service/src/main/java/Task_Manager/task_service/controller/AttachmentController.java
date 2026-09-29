package Task_Manager.task_service.controller;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).ATTACHMENT_VIEW)")
    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> getAttachments(@PathVariable UUID taskId) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByTaskId(taskId));
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<AttachmentResponse> getAttachmentById(@PathVariable UUID attachmentId) {
        return ResponseEntity.ok(attachmentService.getAttachmentById(attachmentId));
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).ATTACHMENT_UPLOAD)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentResponse> uploadAttachment(
            @PathVariable UUID taskId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {

        UUID userId = UUID.fromString(authentication.getName());
        AttachmentResponse response = attachmentService.uploadAttachment(taskId, userId, file);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).ATTACHMENT_VIEW)")
    @GetMapping("/{attachmentId}/view")
    public ResponseEntity<byte[]> viewOrDownloadAttachment(
            @PathVariable UUID taskId,
            @PathVariable UUID attachmentId,
            @RequestParam(value = "download", defaultValue = "false") boolean isDownload,
            Authentication authentication) throws IOException {

        UUID userId = UUID.fromString(authentication.getName());
        AttachmentResponse metadata = attachmentService.getAttachmentById(attachmentId);
        byte[] fileBytes = attachmentService.getAttachmentBytes(attachmentId, userId);

        String dispositionType = isDownload ? "attachment" : "inline";
        String encodedFileName = URLEncoder.encode(metadata.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, dispositionType + "; filename=\"" + encodedFileName + "\"")
                .contentType(MediaType.parseMediaType(metadata.getFileType()))
                .contentLength(metadata.getFileSize())
                .body(fileBytes);
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).ATTACHMENT_DELETE_OWN) " +
            "or @taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).ATTACHMENT_DELETE_ANY)")
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID taskId,
            @PathVariable UUID attachmentId,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        attachmentService.deleteAttachment(attachmentId, userId);
        return ResponseEntity.noContent().build();
    }
}