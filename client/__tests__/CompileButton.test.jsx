import { render, screen, fireEvent } from '@testing-library/react';
import CompileButton from '../src/components/CompileButton.jsx';

test('renders CompileButton and triggers compile', () => {
  render(<CompileButton onClick={() => {}} />);
  const button = screen.getByRole('button');
  expect(button).toBeInTheDocument();
  fireEvent.click(button);
});
