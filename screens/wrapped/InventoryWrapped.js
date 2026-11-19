import BrandedLayout from '../../components/BrandedLayout';
import InventoryScreen from '../InventoryScreen';

export default function InventoryWrapped(props) {
  return (
    <BrandedLayout>
      <InventoryScreen {...props} />
    </BrandedLayout>
  );
}
