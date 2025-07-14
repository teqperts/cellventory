import BrandedLayout from '../../components/BrandedLayout';
import InventoryScreen from '../InventoryScreen';

export default function InventoryWrapped() {
  return (
    <BrandedLayout>
      <InventoryScreen />
    </BrandedLayout>
  );
}
