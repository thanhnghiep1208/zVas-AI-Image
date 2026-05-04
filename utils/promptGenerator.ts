
const subjects = [
  "A majestic lion",
  "A futuristic robot",
  "A serene mountain landscape",
  "A cyberpunk city street",
  "A mystical forest",
  "An astronaut",
  "A vintage sports car",
  "A mythical dragon",
  "A cute Shiba Inu",
  "A steampunk clockwork bird",
  "A glowing jellyfish",
  "A samurai warrior",
  "A cozy cottage",
  "A floating island",
  "A high-tech laboratory",
  "A desert oasis",
  "A Victorian lady",
  "A mischievous fox",
  "A giant whale",
  "A crystal cave"
];

const actions = [
  "running through a field of flowers",
  "exploring an ancient ruin",
  "floating in deep space",
  "standing in the pouring rain",
  "surrounded by magical butterflies",
  "meditating under a cherry blossom tree",
  "fighting a shadow monster",
  "reading a dusty old book",
  "playing a neon guitar",
  "overlooking a vast canyon",
  "diving into a coral reef",
  "walking through a portal",
  "sitting on a throne of ice",
  "flying through a thunderstorm",
  "dancing in a ballroom",
  "painting a masterpiece",
  "drinking tea in a garden",
  "gazing at a supernova",
  "climbing a crystal mountain",
  "hiding in a secret garden"
];

const styles = [
  "in a vibrant oil painting style",
  "as a detailed 3D render",
  "in a minimalist vector art style",
  "as a dark moody photograph",
  "in a classic anime aesthetic",
  "as a surrealist masterpiece",
  "in a gritty cyberpunk style",
  "as a delicate watercolor painting",
  "in a bold pop art style",
  "as a hyper-realistic portrait",
  "in a retro 8-bit pixel art style",
  "as a dramatic charcoal sketch",
  "in a whimsical storybook illustration",
  "as a futuristic holographic projection",
  "in a traditional Japanese ukiyo-e style",
  "as a cinematic movie still",
  "in a synthwave neon aesthetic",
  "as a baroque oil painting",
  "in a modern flat design style",
  "as a double exposure photograph"
];

export const generateRandomPrompt = (): string => {
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  
  return `${subject} ${action}, ${style}`;
};
