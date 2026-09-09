package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.AttachmentRequest;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
@RequiredArgsConstructor
@Slf4j
public class AttachmentController {
    private final AttachmentService attachmentService;

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> getAttachments(@PathVariable UUID taskId) {
        List<AttachmentResponse> responses = attachmentService.getAttachmentsByTaskId(taskId);
        return ResponseEntity.ok(attachmentService.getAttachmentsByTaskId(taskId));
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<AttachmentResponse> getAttachmentById(@PathVariable UUID attachmentId) {
        return ResponseEntity.ok(attachmentService.getAttachmentById(attachmentId));
    }

    @PostMapping
    public ResponseEntity<AttachmentResponse> addAttachment(@PathVariable UUID taskId, @RequestBody AttachmentRequest request, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("SYS_AD"));
        return ResponseEntity.ok(attachmentService.addAttachment(taskId, userId, request, isSystemAdmin));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable UUID attachmentId, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("SYS_AD"));
        attachmentService.deleteAttachment(attachmentId, userId, isSystemAdmin);
        return ResponseEntity.ok().build();
    }
}
