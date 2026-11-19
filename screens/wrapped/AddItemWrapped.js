import BrandedLayout from '../../components/BrandedLayout';
import AddItemScreen from '../AddItemScreen';

export default function AddItemWrapped(props) {
  return (
    <BrandedLayout>
      <AddItemScreen {...props} />
    </BrandedLayout>
  );
}
