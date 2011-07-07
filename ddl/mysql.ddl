CREATE TABLE Manufacturer (
    id INTEGER AUTO_INCREMENT NOT NULL,
    name VARCHAR(32),
    PRIMARY KEY(id)
)
\g
CREATE TABLE Customer (
    id INTEGER AUTO_INCREMENT NOT NULL,
    firstName VARCHAR(32) NOT NULL,
    lastName VARCHAR(32) NOT NULL,
    PRIMARY KEY(id)
)
\g
CREATE TABLE Sale (
    id INTEGER AUTO_INCREMENT NOT NULL,
    customerId INTEGER NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (customerId) REFERENCES Customer(id)
)
\g
CREATE TABLE Product (
    id INTEGER AUTO_INCREMENT NOT NULL,
    manufacturerId INTEGER NOT NULL,
    manufacturerCode VARCHAR(32) NOT NULL,
    name VARCHAR(32) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (manufacturerId) REFERENCES Manufacturer(id)
)
\g
CREATE UNIQUE INDEX legacy_product_id ON Product(manufacturerId, manufacturerCode)
\g
CREATE INDEX product_name ON Product(name)
\g
CREATE TABLE SaleItem (
    id INTEGER AUTO_INCREMENT NOT NULL,
    saleId INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(7,2) NOT NULL,
    manufacturerId INTEGER NOT NULL,
    manufacturerCode VARCHAR(32) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (saleId) REFERENCES Sale(id),
    FOREIGN KEY (manufacturerId) REFERENCES Manufacturer(id),
    FOREIGN KEY (manufacturerId, manufacturerCode) REFERENCES Product(manufacturerId, manufacturerCode)
)
\g
INSERT INTO Manufacturer(name) VALUES('Acme')
\g
INSERT INTO Product(name, manufacturerId, manufacturerCode) VALUES('Heavy Anvil', 1, 'A')
\g
INSERT INTO Customer(firstName, lastName) VALUES('Wile E.', 'Coyote')
\g
INSERT INTO Sale(customerId) VALUES(1)
\g
INSERT INTO SaleItem(saleId, manufacturerId, manufacturerCode, quantity, price) VALUES(1, 1, 'A', 2, 44.99)
\g
