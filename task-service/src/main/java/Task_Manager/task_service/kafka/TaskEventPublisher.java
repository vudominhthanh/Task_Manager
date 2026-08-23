package Task_Manager.task_service.kafka;

import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TaskEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "task_events";

    public void publishTaskCreated(TaskResponse task) {
        kafkaTemplate.send(TOPIC, task.getId().toString(), new TaskEvent("CREATED", task));
    }

    public void publishTaskUpdated(TaskResponse task) {
        kafkaTemplate.send(TOPIC, task.getId().toString(), new TaskEvent("UPDATED", task));
    }

    public void publishTaskDeleted(UUID taskId) {
        kafkaTemplate.send(TOPIC, taskId.toString(), new TaskEvent("DELETED", taskId));
    }
}

record TaskEvent(String type, Object payload) {}