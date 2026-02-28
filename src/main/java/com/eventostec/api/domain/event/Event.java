package com.eventostec.api.domain.event;

import com.eventostec.api.domain.address.Address;
import com.eventostec.api.domain.coupon.Coupon;
import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Table(name = "event")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue
    private UUID id;

    private  String title;
    private  String description;
    private  String imgUrl;
    private  String eventUrl;
    private boolean remote;
    private Date date;

    @OneToOne(mappedBy = "event", cascade = CascadeType.ALL)
    private Address address;

    @OneToOne(mappedBy = "event", cascade = CascadeType.ALL)
    private Coupon coupons;


    public Event(String title,
                 String description,
                 String eventUrl,
                 Date date,
                 String imgUrl,
                 Boolean remote) {
        this.title = title;
        this.description = description;
        this.eventUrl = eventUrl;
        this.imgUrl = imgUrl;
        this.remote = remote != null && remote;
        this.date = date;
    }
}
