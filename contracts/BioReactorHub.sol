// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BioReactorHub is ERC20, Ownable {
    struct Reactor {
        string name;
        string city;
        string species;
        string tagline;
        uint256 proteinPct;
        uint256 waterSavedPct;
        uint256 biomassKg;
        uint256 supporters;
        uint256 totalSupported;
        string proofURI;
    }

    uint256 public reactorCount;
    uint256 public totalHarvestedKg;
    uint256 public totalSupported;

    mapping(uint256 => Reactor) private reactors;

    event ReactorSupported(
        uint256 indexed reactorId,
        address indexed supporter,
        uint256 amount,
        uint256 minted,
        string backerName
    );

    event HarvestLogged(
        uint256 indexed reactorId,
        uint256 biomassKg,
        string proofURI
    );

    constructor(address initialOwner) ERC20("BioReactor Token", "BRT") Ownable(initialOwner) {
        _createReactor(
            "Wolffia One",
            "Guadalajara",
            "Wolffia globosa",
            "Proteina sostenible en formato urbano",
            40,
            92,
            180,
            "ipfs://wolffia-one-genesis"
        );
        _createReactor(
            "Protein Pod",
            "Zapopan",
            "Wolffia globosa",
            "Biomasa rastreable para alimento funcional",
            38,
            89,
            120,
            "ipfs://protein-pod-genesis"
        );
        _createReactor(
            "Green Loop",
            "Tlaquepaque",
            "Wolffia globosa",
            "Microgranjas que convierten espacio vacio en nutricion",
            41,
            94,
            210,
            "ipfs://green-loop-genesis"
        );
    }

    function supportReactor(uint256 reactorId, string calldata backerName) external payable returns (uint256 minted) {
        require(reactorId < reactorCount, "Invalid reactor");
        require(msg.value > 0, "Send MON to support");

        minted = msg.value * 1000;
        Reactor storage reactor = reactors[reactorId];

        reactor.supporters += 1;
        reactor.totalSupported += msg.value;
        totalSupported += msg.value;

        _mint(msg.sender, minted);

        emit ReactorSupported(reactorId, msg.sender, msg.value, minted, backerName);
    }

    function logHarvest(uint256 reactorId, uint256 biomassKg, string calldata proofURI) external onlyOwner {
        require(reactorId < reactorCount, "Invalid reactor");
        require(biomassKg > 0, "Biomass required");

        Reactor storage reactor = reactors[reactorId];
        reactor.biomassKg += biomassKg;
        reactor.proofURI = proofURI;
        totalHarvestedKg += biomassKg;

        emit HarvestLogged(reactorId, biomassKg, proofURI);
    }

    function getReactor(uint256 reactorId)
        external
        view
        returns (
            string memory name,
            string memory city,
            string memory species,
            string memory tagline,
            uint256 proteinPct,
            uint256 waterSavedPct,
            uint256 biomassKg,
            uint256 supporters,
            uint256 totalSupportedWei,
            string memory proofURI
        )
    {
        require(reactorId < reactorCount, "Invalid reactor");
        Reactor storage reactor = reactors[reactorId];

        return (
            reactor.name,
            reactor.city,
            reactor.species,
            reactor.tagline,
            reactor.proteinPct,
            reactor.waterSavedPct,
            reactor.biomassKg,
            reactor.supporters,
            reactor.totalSupported,
            reactor.proofURI
        );
    }

    function withdraw(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Bad recipient");
        recipient.transfer(address(this).balance);
    }

    function _createReactor(
        string memory name,
        string memory city,
        string memory species,
        string memory tagline,
        uint256 proteinPct,
        uint256 waterSavedPct,
        uint256 biomassKg,
        string memory proofURI
    ) internal {
        reactors[reactorCount] = Reactor({
            name: name,
            city: city,
            species: species,
            tagline: tagline,
            proteinPct: proteinPct,
            waterSavedPct: waterSavedPct,
            biomassKg: biomassKg,
            supporters: 0,
            totalSupported: 0,
            proofURI: proofURI
        });

        totalHarvestedKg += biomassKg;
        reactorCount += 1;
    }
}
