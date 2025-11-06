import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import LiveMode from './components/LiveMode';
import PotholeMap from './components/PotholeMap';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// Page wrapper component
function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/live" element={<PageWrapper><LiveMode /></PageWrapper>} />
        <Route path="/pothole-map" element={<PageWrapper><PotholeMap /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AnimatedRoutes />
      </Router>
    </ErrorBoundary>
  );
}
