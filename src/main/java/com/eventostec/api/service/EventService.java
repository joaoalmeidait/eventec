package com.eventostec.api.service;

import com.amazonaws.services.s3.AmazonS3;
import com.eventostec.api.domain.address.Address;
import com.eventostec.api.domain.coupon.Coupon;
import com.eventostec.api.domain.event.Event;
import com.eventostec.api.domain.event.EventDetailsDTO;
import com.eventostec.api.domain.event.EventRequestDTO;
import com.eventostec.api.domain.event.EventResponseDTO;
import com.eventostec.api.exception.ResourceNotFoundException;
import com.eventostec.api.repositories.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class EventService {

    @Autowired
    private AmazonS3 s3Client;

    @Autowired
    private EventRepository repository;

    @Autowired
    private AddressService addressService;

    @Autowired
    private CouponService couponService;

    @Value("${aws.bucket.name}")
    private String bucketName;

    public EventResponseDTO createEvent(EventRequestDTO data){
        String imgUrl = null;

        if (data.image() != null){
            imgUrl = this.uploadImg(data.image());
        }else {
            imgUrl = "https://joaoalmeidait-eventostec-imagens.s3.amazonaws.com/ef49098c-fd23-4ed3-8c3a-cac4d3ee7418-SCR-20260301-qclj.png";
        }

        Event newEvent = new Event(
                data.title(),
                data.description(),
                data.eventUrl(),
                new Date(data.date()),
                imgUrl,
                data.remote()
        );

        repository.save(newEvent);

        if (!data.remote()){
            this.addressService.createAddress(data, newEvent);
        }

        return new EventResponseDTO(newEvent);
    }

    private String uploadImg(MultipartFile multipartFile){
        String fileName = UUID.randomUUID() + "-" +multipartFile.getOriginalFilename();

        try {
            File file = this.convertMultipartToFile(multipartFile);
            s3Client.putObject(bucketName, fileName, file);
            file.delete();
            return s3Client.getUrl(bucketName, fileName).toString();
        }catch (Exception e){
            System.out.println("erro ao subir arquivo");
            return null;

        }}

    private File convertMultipartToFile(MultipartFile multipartFile) throws IOException {
        File convFile = new File(Objects.requireNonNull(multipartFile.getOriginalFilename()));
        FileOutputStream fos = new FileOutputStream(convFile);
        fos.write(multipartFile.getBytes());
        fos.close();
        return convFile;
    }

    public List<EventResponseDTO> getUpcomingEvents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Event> eventsPage = this.repository.findUpcomingEvents(new Date(), pageable);

        return eventsPage.map(EventResponseDTO::new)
                .stream()
                .toList();
    }

    public List<EventResponseDTO> getFilteredEvents(int page, int size, String title, String city, String uf, Date startDate, Date endDate) {
        title = (title!=null) ? title: "";
        city = (city!=null) ? city: "";
        uf = (uf!=null) ? uf: "";
        startDate = (startDate!=null) ? startDate: new Date(0);
        endDate = (endDate != null)
                ? endDate
                : Date.from(
                LocalDate.now()
                        .plusYears(10)
                        .atStartOfDay(ZoneId.systemDefault())
                        .toInstant()
        );

        Pageable pageable = PageRequest.of(page, size);
        Page<Event> eventsPage = this.repository.findFilteredEvents(title, city, uf, startDate, endDate, pageable);

        return eventsPage.map(EventResponseDTO::new)
                .stream()
                .toList();
    }

    public EventDetailsDTO getEventByID(UUID id) {
        Event event = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        List<Coupon> coupons = couponService.consultCoupons(id, new Date());

        List<EventDetailsDTO.CouponDTO> couponDTOs = coupons.stream()
                .map(coupon -> new EventDetailsDTO.CouponDTO(
                        coupon.getCode(),
                        coupon.getDiscount(),
                        coupon.getValid()
                )).toList();

        String city = null;
        String uf = null;

        if (!event.isRemote() && event.getAddress() != null) {
            city = event.getAddress().getCity();
            uf = event.getAddress().getUf();
        }

        return new EventDetailsDTO(event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getDate(),
                city,
                uf,
                event.getEventUrl(),
                event.getImgUrl(),
                event.isRemote(),
                couponDTOs
                );
    }

    public void deleteEventById(UUID id) {
        Event event = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        repository.deleteById(id);
    }
}
