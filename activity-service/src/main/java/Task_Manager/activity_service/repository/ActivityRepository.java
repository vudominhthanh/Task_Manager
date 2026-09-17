package Task_Manager.activity_service.repository;

import Task_Manager.activity_service.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, String>, JpaSpecificationExecutor<Activity> {
    List<Activity> findByOrderByCreatedAtDesc();

    List<Activity> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Activity> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Activity> findByTargetIdOrderByCreatedAtDesc(String targetId);
    List<Activity> findTop5ByUserIdOrderByCreatedAtDesc(String userId);


}
