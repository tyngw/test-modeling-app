// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="container">
      <h1>404 - Page Not Found</h1>
      <p>The requested resource could not be located</p>
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: '404 - Page Not Found',
    description: 'The requested page does not exist',
  };
}
