import { Text } from 'ink';
import { Title } from '../components/Title.js';

export function Result({ lines }: { lines: string[] }) {
  return (
    <>
      <Title text="Result" />
      {lines.length === 0 ? <Text>nothing to do</Text> : lines.map((text) => <Text key={text}>{text}</Text>)}
    </>
  );
}
