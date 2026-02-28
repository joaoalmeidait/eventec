package com.eventostec.api.controller;

import com.eventostec.api.domain.coupon.Coupon;
import com.eventostec.api.domain.coupon.CouponRequestDTO;
import com.eventostec.api.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("api/coupon")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @PostMapping("/{eventID}")
    public ResponseEntity<Coupon> addCouponsToEvent(@PathVariable UUID eventID, @RequestBody CouponRequestDTO data){
        Coupon coupons = couponService.addCouponToEvent(eventID, data);
        return ResponseEntity.ok(coupons);
    }
}
