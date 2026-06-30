const ADJECTIVES = [
  "Sneaky",
  "Loud",
  "Salty",
  "Sleepy",
  "Wild",
  "Lucky",
  "Grumpy",
  "Hyper",
  "Chill",
  "Mighty",
  "Sneaky",
  "Cosmic",
  "Spicy",
  "Quiet",
  "Fierce",
];

const ANIMALS = [
  "Penguin",
  "Falcon",
  "Tiger",
  "Otter",
  "Panda",
  "Wolf",
  "Eagle",
  "Koala",
  "Shark",
  "Fox",
  "Lion",
  "Hawk",
  "Bear",
  "Cobra",
  "Lynx",
];

function randomNickname() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj} ${animal} ${num}`;
}

module.exports = { randomNickname };
