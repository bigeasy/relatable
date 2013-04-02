CREATE TABLE Manufacturer (
    id                  SERIAL NOT NULL,
    name                VARCHAR(32),
    PRIMARY KEY(id)
)
\g
CREATE TABLE Customer (
    id                  SERIAL NOT NULL,
    first_name          VARCHAR(32) NOT NULL,
    last_name           VARCHAR(32) NOT NULL,
    PRIMARY KEY(id)
)
\g
CREATE TABLE Sale (
    id                  SERIAL NOT NULL,
    customer_id         INTEGER NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (customer_id) REFERENCES Customer(id)
)
\g
CREATE TABLE Product (
    id                  SERIAL NOT NULL,
    manufacturer_id     INTEGER NOT NULL,
    manufacturer_code   VARCHAR(32) NOT NULL,
    name                VARCHAR(32) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (manufacturer_id) REFERENCES Manufacturer(id)
)
\g
CREATE UNIQUE INDEX legacy_product_id ON Product(manufacturer_id, manufacturer_code)
\g
CREATE INDEX product_name ON Product(name)
\g
CREATE TABLE Sale_Item (
    id                  SERIAL NOT NULL,
    sale_id             INTEGER NOT NULL,
    quantity            INTEGER NOT NULL,
    price               DECIMAL(7,2) NOT NULL,
    manufacturer_id     INTEGER NOT NULL,
    manufacturer_code   VARCHAR(32) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (sale_id) REFERENCES Sale(id),
    FOREIGN KEY (manufacturer_id) REFERENCES Manufacturer(id),
    FOREIGN KEY (manufacturer_id, manufacturer_code) REFERENCES Product(manufacturer_id, manufacturer_code)
)
\g
INSERT INTO Manufacturer(name) VALUES('Acme')
\g
INSERT INTO Product(name, manufacturer_id, manufacturer_code) VALUES('Heavy Anvil', 1, 'A')
\g
INSERT INTO Product(name, manufacturer_id, manufacturer_code) VALUES('Tornado Seeds', 1, 'B')
\g
INSERT INTO Customer(first_name, last_name) VALUES('Wile E.', 'Coyote')
\g
INSERT INTO Sale(customer_id) VALUES(1)
\g
INSERT INTO Sale_Item(sale_id, manufacturer_id, manufacturer_code, quantity, price) VALUES(1, 1, 'A', 2, 44.99)
\g
