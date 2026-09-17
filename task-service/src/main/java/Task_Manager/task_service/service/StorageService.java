package Task_Manager.task_service.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name:task-manager-attachments}")
    private String bucketName;

    @PostConstruct
    public void initBucket() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            log.info("[Storage] Bucket '{}' đã sẵn sàng.", bucketName);
        } catch (S3Exception e) {
            log.info("[Storage] Bucket '{}' chưa tồn tại, đang tự động tạo mới...", bucketName);
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                log.info("[Storage] Đã tạo thành công bucket: {}", bucketName);
            } catch (Exception ex) {
                log.error("[Storage] Lỗi khi tạo bucket tự động: {}", ex.getMessage());
            }
        }
    }

    public String uploadFile(MultipartFile file, UUID projectId, UUID taskId) throws IOException {
        String originalFileName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9.\\-_]", "_")
                : "file";

        String s3Key = String.format("projects/%s/tasks/%s/%s_%s",
                projectId != null ? projectId : "global",
                taskId,
                UUID.randomUUID(),
                originalFileName);

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

        s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        log.info("[Storage] Upload thành công s3Key: {}", s3Key);
        return s3Key;
    }

    public byte[] downloadFile(String s3Key) throws IOException {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        return s3Client.getObject(getRequest, ResponseTransformer.toBytes()).asByteArray();
    }

    public void deleteFile(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) return;
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("[Storage] Đã xóa file trên bucket: {}", s3Key);
        } catch (Exception e) {
            log.error("[Storage] Lỗi khi xóa file trên S3 (s3Key: {}): {}", s3Key, e.getMessage());
        }
    }
}