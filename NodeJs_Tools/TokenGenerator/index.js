export default function TokenGenerator() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');

  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  const randomSlice = (length) => Array.from({ length }, randomChar).join('');

  const header = randomChar();
  const body = randomSlice(6) + Math.floor(Math.random() * 1000);
  const footer = randomSlice(4);

  return `${header}${body}${footer}`;
}

console.log(TokenGenerator());
