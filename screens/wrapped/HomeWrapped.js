import BrandedLayout from '../../components/BrandedLayout';
import HomeScreen from '../HomeScreen';

export default function HomeWrapped(props) {
  return (
    <BrandedLayout>
      <HomeScreen {...props} />
    </BrandedLayout>
  );
}
