import type { ConnectionsCategory } from '../types';

/** 60 days of Connections puzzles — indexed by (seed % length) */
export const CONNECTIONS_PUZZLES: ConnectionsCategory[][] = [
  [
    { label: 'Things in a toolbox', words: ['HAMMER','DRILL','WRENCH','PLIERS'], color: 'yellow', emoji: '🟨' },
    { label: 'Ocean creatures', words: ['SHARK','WHALE','SQUID','PRAWN'], color: 'green', emoji: '🟩' },
    { label: '___ ball', words: ['BASKET','FOOT','BASE','SOFT'], color: 'blue', emoji: '🟦' },
    { label: 'SA cities', words: ['DURBAN','SOWETO','PRETORIA','GEORGE'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Coffee drinks', words: ['LATTE','MOCHA','ESPRESSO','FLAT'], color: 'yellow', emoji: '🟨' },
    { label: 'Wild cats', words: ['TIGER','CHEETAH','JAGUAR','OCELOT'], color: 'green', emoji: '🟩' },
    { label: 'Types of music', words: ['JAZZ','BLUES','SOUL','FUNK'], color: 'blue', emoji: '🟦' },
    { label: 'Planets', words: ['MARS','VENUS','SATURN','EARTH'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Currencies', words: ['RAND','EURO','POUND','FRANC'], color: 'yellow', emoji: '🟨' },
    { label: 'SA politicians', words: ['RAMAPHOSA','ZUMA','MANDELA','MBEKI'], color: 'green', emoji: '🟩' },
    { label: 'Rugby positions', words: ['HOOKER','FLANK','LOCK','SCRUMHALF'], color: 'blue', emoji: '🟦' },
    { label: 'Braai items', words: ['BOEREWORS','CHOPS','RIBS','MIELIES'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Desert animals', words: ['CAMEL','FENNEC','VIPER','GECKO'], color: 'yellow', emoji: '🟨' },
    { label: 'Cloud types', words: ['CIRRUS','NIMBUS','STRATUS','CUMULUS'], color: 'green', emoji: '🟩' },
    { label: 'Web browsers', words: ['CHROME','SAFARI','FIREFOX','EDGE'], color: 'blue', emoji: '🟦' },
    { label: 'SA languages', words: ['ZULU','XHOSA','SOTHO','TSWANA'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Breakfast foods', words: ['OATS','TOAST','EGGS','BACON'], color: 'yellow', emoji: '🟨' },
    { label: 'Board games', words: ['CHESS','LUDO','SCRABBLE','RISK'], color: 'green', emoji: '🟩' },
    { label: 'Social networks', words: ['TWITTER','TIKTOK','INSTAGRAM','REDDIT'], color: 'blue', emoji: '🟦' },
    { label: 'Mountain ranges', words: ['ALPS','ANDES','ROCKIES','ATLAS'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Fast food brands', words: ['NANDOS','STEERS','WIMPY','KFC'], color: 'yellow', emoji: '🟨' },
    { label: 'Types of pasta', words: ['PENNE','RIGATONI','FUSILLI','LINGUINE'], color: 'green', emoji: '🟩' },
    { label: 'Coding languages', words: ['PYTHON','RUST','SWIFT','KOTLIN'], color: 'blue', emoji: '🟦' },
    { label: 'African rivers', words: ['NILE','LIMPOPO','ZAMBEZI','CONGO'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Card suits', words: ['HEARTS','CLUBS','DIAMONDS','SPADES'], color: 'yellow', emoji: '🟨' },
    { label: 'Vegetables', words: ['KALE','LEEK','TURNIP','PARSNIP'], color: 'green', emoji: '🟩' },
    { label: 'Cocktail bases', words: ['VODKA','RUM','GIN','TEQUILA'], color: 'blue', emoji: '🟦' },
    { label: 'Superhero studios', words: ['MARVEL','DC','DARK HORSE','IMAGE'], color: 'purple', emoji: '🟪' },
  ],
  [
    { label: 'Types of bread', words: ['SOURDOUGH','ROTI','CIABATTA','BRIOCHE'], color: 'yellow', emoji: '🟨' },
    { label: 'Space missions', words: ['APOLLO','GEMINI','VOYAGER','HUBBLE'], color: 'green', emoji: '🟩' },
    { label: 'Dance styles', words: ['SALSA','TANGO','WALTZ','BALLET'], color: 'blue', emoji: '🟦' },
    { label: 'SA sports heroes', words: ['DE VILLIERS','KOLISI','STEYN','SMITH'], color: 'purple', emoji: '🟪' },
  ],
];
