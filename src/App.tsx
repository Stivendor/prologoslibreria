import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CatalogPage } from './pages/CatalogPage';
import { BookDetailPage } from './pages/BookDetailPage';

// El panel es solo para el admin: no debe pesar en el bundle de la tienda.
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);

// /catalogo vivía como ruta propia; redirige a la landing conservando ?categoria=...
function RedirigirCatalogo() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/', search }} replace />;
}

// /carrito era una página; ahora es un panel lateral: la ruta sobrevive para los
// enlaces viejos, abriendo el drawer sobre la landing.
function RedirigirCarrito() {
  const { abrirCarrito } = useCart();
  useEffect(abrirCarrito, [abrirCarrito]);
  return <Navigate to="/" replace />;
}

// El panel /admin no lleva el chrome de la tienda (header, footer, WhatsApp).
function Contenido() {
  const esAdmin = useLocation().pathname === '/admin';

  // La animación page-in solo corre en navegaciones internas: en la carga
  // inicial competiría con el parseo del bundle y se vería entrecortada.
  // Doble rAF: garantiza que el atributo se ponga después del primer paint.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-cargada', '');
      })
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <>
      {!esAdmin && <Header />}
      <main className="site-main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/catalogo" element={<RedirigirCatalogo />} />
            <Route path="/libro/:id" element={<BookDetailPage />} />
            <Route path="/carrito" element={<RedirigirCarrito />} />
            <Route
              path="/admin"
              element={
                <AuthProvider>
                  <Suspense fallback={<div className="container section">Cargando…</div>}>
                    <AdminPage />
                  </Suspense>
                </AuthProvider>
              }
            />
            <Route path="*" element={<CatalogPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!esAdmin && <Footer />}
      {!esAdmin && <WhatsAppButton />}
      {!esAdmin && <CartDrawer />}
    </>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Contenido />
        <Analytics />
      </BrowserRouter>
    </CartProvider>
  );
}
