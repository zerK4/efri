import { PublicRouteController } from '../controllers/PublicRouteController';
import { Router } from '../router';

const router = Router.getInstance();

router.get('/public/{file}', [PublicRouteController, 'handle']);
