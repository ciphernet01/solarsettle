import { render, screen } from ''@testing-library/react'';
import App from ''./App'';

test(''renders the SolarSettle landing page'', () => {
  render(<App />);
  const brand = screen.getAllByText(/solarsettle/i);
  expect(brand.length).toBeGreaterThan(0);
});
