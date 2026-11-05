-- Loaded only by e2e-isolated.mjs into its newly created disposable database.
BEGIN;
CREATE TEMP TABLE booking_e2e_fixture(trip_id int,boarding_stop_id int,alighting_stop_id int,date text,timezone text,capacity int);
DO $$
DECLARE category_id int; bus_status_id int; driver_status_id int; bus_id int;
        driver_id int; city_id int; first_stop int; last_stop int; trip_id int;
        departure timestamp := (current_date+3)+time '10:00';
BEGIN
 INSERT INTO bus_categories(name) VALUES('Booking E2E category') RETURNING id INTO category_id;
 INSERT INTO bus_statuses(name) VALUES('Booking E2E ready') RETURNING id INTO bus_status_id;
 INSERT INTO driver_status(name) VALUES('Booking E2E driver') RETURNING id INTO driver_status_id;
 INSERT INTO bus(license_plate,brand,capacity,category_id,status_id)
 VALUES('BOOK-E2E','Booking E2E',2,category_id,bus_status_id) RETURNING id INTO bus_id;
 INSERT INTO drivers(first_name,last_name,middle_name,phone_number,status)
 VALUES('Тест','Бронирования','','DEMO-NO-PHONE',driver_status_id) RETURNING id INTO driver_id;
 SELECT id INTO STRICT city_id FROM route_cities WHERE name='Екатеринбург' ORDER BY id LIMIT 1;
 INSERT INTO stops(name,address,latitude,longitude,city_id)
 VALUES('Тест брони А','Тестовый адрес',56.8,60.6,city_id) RETURNING id INTO first_stop;
 INSERT INTO stops(name,address,latitude,longitude,city_id)
 VALUES('Тест брони Б','Тестовый адрес',56.81,60.61,city_id) RETURNING id INTO last_stop;
 INSERT INTO trips(bus_id,driver_id,start_time,end_time,status,base_price,is_demo)
 VALUES(bus_id,driver_id,departure,departure+interval '1 hour','scheduled',150.01,true) RETURNING id INTO trip_id;
 INSERT INTO trip_stops(trip_id,stop_id,arrival_time,departure_time,stop_order,price_to_next)
 VALUES(trip_id,first_stop,departure,departure,1,150.01),
       (trip_id,last_stop,departure+interval '1 hour',departure+interval '1 hour',2,0);
 INSERT INTO booking_e2e_fixture VALUES(trip_id,first_stop,last_stop,to_char(departure,'YYYY-MM-DD'),'Asia/Yekaterinburg',2);
END $$;
SELECT row_to_json(fixture) FROM booking_e2e_fixture fixture;
COMMIT;
