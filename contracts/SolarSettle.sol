// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SolarSettle {

    address public owner;

    struct Prosumer {
        string subsidyID;
        uint256 panelCapacity; // in Wh (watt-hours) for simplicity
        string location;
        bool registered;
        uint256 trustScore; // out of 100
        uint256 totalEnergyGenerated;
        uint256 carbonCredits;
        uint256 lastReadingTimestamp;
    }

    struct EnergyListing {
        address seller;
        uint256 kWh;
        uint256 pricePerUnit; // in wei
        bool active;
    }

    mapping(address => Prosumer) public prosumers;
    mapping(uint256 => EnergyListing) public listings;
    uint256 public listingCount;

    event ProsumerRegistered(address indexed prosumer, string subsidyID, string location);
    event EnergyLogged(address indexed prosumer, uint256 kWh, uint256 timestamp);
    event TrustScoreUpdated(address indexed prosumer, uint256 newScore);
    event EnergyListed(uint256 listingId, address indexed seller, uint256 kWh, uint256 price);
    event EnergyPurchased(uint256 listingId, address indexed buyer, address indexed seller, uint256 kWh);
    event CarbonCreditMinted(address indexed prosumer, uint256 amount);

    modifier onlyRegistered() {
        require(prosumers[msg.sender].registered, "Not a registered prosumer");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerProsumer(
        string memory subsidyID,
        uint256 panelCapacity,
        string memory location
    ) external {
        require(!prosumers[msg.sender].registered, "Already registered");

        prosumers[msg.sender] = Prosumer({
            subsidyID: subsidyID,
            panelCapacity: panelCapacity,
            location: location,
            registered: true,
            trustScore: 70,
            totalEnergyGenerated: 0,
            carbonCredits: 0,
            lastReadingTimestamp: block.timestamp
        });

        emit ProsumerRegistered(msg.sender, subsidyID, location);
    }

    function logEnergyGeneration(uint256 kWh) external onlyRegistered {
        Prosumer storage p = prosumers[msg.sender];

        p.totalEnergyGenerated += kWh;
        p.lastReadingTimestamp = block.timestamp;

        emit EnergyLogged(msg.sender, kWh, block.timestamp);

        _updateTrustScore(msg.sender);
        _mintCarbonCredit(msg.sender, kWh);
    }

    function _updateTrustScore(address prosumerAddr) internal {
        Prosumer storage p = prosumers[prosumerAddr];

        if (p.trustScore < 100) {
            p.trustScore += 2;
            if (p.trustScore > 100) {
                p.trustScore = 100;
            }
        }

        emit TrustScoreUpdated(prosumerAddr, p.trustScore);
    }

    function checkInactivity(address prosumerAddr) external {
        Prosumer storage p = prosumers[prosumerAddr];
        require(p.registered, "Not registered");

        if (block.timestamp - p.lastReadingTimestamp > 7 days) {
            if (p.trustScore >= 20) {
                p.trustScore -= 20;
            } else {
                p.trustScore = 0;
            }
            emit TrustScoreUpdated(prosumerAddr, p.trustScore);
        }
    }

    function _mintCarbonCredit(address prosumerAddr, uint256 kWh) internal {
        prosumers[prosumerAddr].carbonCredits += kWh;
        emit CarbonCreditMinted(prosumerAddr, kWh);
    }

    function listEnergy(uint256 kWh, uint256 pricePerUnit) external onlyRegistered {
        require(kWh > 0, "kWh must be greater than 0");

        listings[listingCount] = EnergyListing({
            seller: msg.sender,
            kWh: kWh,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit EnergyListed(listingCount, msg.sender, kWh, pricePerUnit);
        listingCount++;
    }

    function buyEnergy(uint256 listingId) external payable {
        EnergyListing storage listing = listings[listingId];
        require(listing.active, "Listing not active");

        uint256 totalPrice = listing.kWh * listing.pricePerUnit;
        require(msg.value >= totalPrice, "Insufficient payment");

        listing.active = false;

        payable(listing.seller).transfer(totalPrice);

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit EnergyPurchased(listingId, msg.sender, listing.seller, listing.kWh);
    }

    function getProsumer(address prosumerAddr) external view returns (
        string memory subsidyID,
        uint256 panelCapacity,
        string memory location,
        uint256 trustScore,
        uint256 totalEnergyGenerated,
        uint256 carbonCredits
    ) {
        Prosumer memory p = prosumers[prosumerAddr];
        return (p.subsidyID, p.panelCapacity, p.location, p.trustScore, p.totalEnergyGenerated, p.carbonCredits);
    }
}