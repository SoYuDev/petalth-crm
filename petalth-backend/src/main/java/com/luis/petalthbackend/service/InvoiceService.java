package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.response.InvoiceDTO;
import com.luis.petalthbackend.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getAllInvoices() {
        return invoiceRepository.findAll()
                .stream()
                .map(inv -> new InvoiceDTO(
                        inv.getId(),
                        inv.getIssueDate(),
                        inv.getAmount().doubleValue(),
                        inv.getStatus().name()
                ))
                .toList();
    }
}