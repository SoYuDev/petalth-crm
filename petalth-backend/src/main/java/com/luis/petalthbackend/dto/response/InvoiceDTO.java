package com.luis.petalthbackend.dto.response;

import java.time.LocalDateTime;

public record InvoiceDTO(
    Long id,
    LocalDateTime issueDate,
    Double amount,
    String status
) {}