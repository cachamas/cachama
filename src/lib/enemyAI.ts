import * as THREE from 'three';
import { RapierRigidBody } from '@react-three/rapier';

export type EnemyType = 'basic' | 'heavy' | 'sniper';
export type EnemyState = 'idle' | 'patrolling' | 'chasing' | 'attacking' | 'strafing' | 'retreating' | 'dead';

interface EnemyStats {
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  accuracy: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  basic: {
    health: 100,
    speed: 9,
    damage: 10,
    attackRange: 15,
    attackCooldown: 1000,
    accuracy: 0.7
  },
  heavy: {
    health: 200,
    speed: 6,
    damage: 20,
    attackRange: 10,
    attackCooldown: 2000,
    accuracy: 0.8
  },
  sniper: {
    health: 80,
    speed: 7.5,
    damage: 40,
    attackRange: 30,
    attackCooldown: 3000,
    accuracy: 0.9
  }
};

// Add state transition cooldowns and thresholds
const STATE_CONFIG = {
  MIN_STATE_DURATION: 0.5, // Reduced for faster reactions
  DISTANCE_THRESHOLDS: {
    CHASE_START: 30,    // Increased range to start chasing
    CHASE_STOP: 35,     // Increased range to stop chasing
    ATTACK_START: 15,   // Increased for better positioning
    ATTACK_STOP: 20,    // Increased for better positioning
    RETREAT_START: 12,  // Increased retreat threshold
    RETREAT_STOP: 18,   // Increased retreat safe distance
    STRAFE_RANGE: 15,   // Increased optimal range
    COVER_SEARCH_RADIUS: 25, // Maximum radius to search for cover
  },
  STRAFE_DURATION: 1.5, // Reduced for more dynamic movement
} as const;

export class EnemyAI {
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private rigidBody: RapierRigidBody;
  private type: EnemyType;
  private state: EnemyState;
  private lastAttackTime: number;
  private lastStateChangeTime: number;
  private patrolPoints: THREE.Vector3[];
  private currentPatrolIndex: number;
  private strafeDirection: 1 | -1;
  private strafeTime: number;
  private health: number;
  private previousState: EnemyState;
  private modelHeight: number = 5;
  private retreatStartTime: number = 0;
  private lastCoverPosition: THREE.Vector3 | null = null;

  constructor(
    type: EnemyType,
    position: THREE.Vector3,
    rigidBody: RapierRigidBody,
    patrolPoints?: THREE.Vector3[]
  ) {
    this.type = type;
    // Start position should be higher by model height
    position.y += this.modelHeight;
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.rigidBody = rigidBody;
    
    // Set initial RigidBody position to match
    rigidBody.setTranslation(
      { 
        x: position.x, 
        y: position.y, 
        z: position.z 
      },
      true
    );

    this.state = 'idle';
    this.previousState = 'idle';
    this.lastAttackTime = 0;
    this.lastStateChangeTime = 0;
    this.patrolPoints = patrolPoints || this.generatePatrolPoints();
    this.currentPatrolIndex = 0;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
    this.strafeTime = 0;
    this.health = ENEMY_STATS[type].health;
  }

  private generatePatrolPoints(): THREE.Vector3[] {
    // Generate a circular patrol path around spawn point
    const points: THREE.Vector3[] = [];
    const radius = 5;
    const segments = 4;
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        this.position.x + Math.cos(angle) * radius,
        this.position.y,
        this.position.z + Math.sin(angle) * radius
      ));
    }
    
    return points;
  }

  takeDamage(damage: number): boolean {
    this.health -= damage;
    if (this.health <= 0) {
      this.state = 'dead';
      return true;
    }
    return false;
  }

  private canSeePlayer(playerPosition: THREE.Vector3, obstacles: THREE.Object3D[]): boolean {
    const raycaster = new THREE.Raycaster();
    const direction = playerPosition.clone().sub(this.position).normalize();
    raycaster.set(this.position, direction);
    
    const intersects = raycaster.intersectObjects(obstacles);
    if (intersects.length === 0) return true;
    
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    return intersects[0].distance > distanceToPlayer;
  }

  private findCover(playerPosition: THREE.Vector3, obstacles: THREE.Object3D[]): THREE.Vector3 | null {
    let bestCoverPos = null;
    let bestScore = -1;

    obstacles.forEach(obstacle => {
      if (!(obstacle instanceof THREE.Mesh)) return;
      
      const obstaclePos = new THREE.Vector3();
      obstacle.getWorldPosition(obstaclePos);
      
      // Check if obstacle is within range
      const distanceToObstacle = this.position.distanceTo(obstaclePos);
      if (distanceToObstacle > STATE_CONFIG.DISTANCE_THRESHOLDS.COVER_SEARCH_RADIUS) return;

      // Calculate cover positions around the obstacle
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const coverPos = obstaclePos.clone().add(
          new THREE.Vector3(
            Math.cos(angle) * 3,
            0,
            Math.sin(angle) * 3
          )
        );

        // Score this position based on:
        // 1. Distance from player (further is better, up to a point)
        // 2. Whether obstacle blocks line of sight to player
        // 3. Distance from current position (closer is better)
        const distanceToPlayer = coverPos.distanceTo(playerPosition);
        const distanceFromCurrent = coverPos.distanceTo(this.position);
        
        const score = (
          (Math.min(distanceToPlayer, 20) / 20) * 0.4 + // Distance from player (40% weight)
          (1 - distanceFromCurrent / STATE_CONFIG.DISTANCE_THRESHOLDS.COVER_SEARCH_RADIUS) * 0.6 // Distance from current (60% weight)
        );

        if (score > bestScore) {
          bestScore = score;
          bestCoverPos = coverPos;
        }
      }
    });

    return bestCoverPos;
  }

  private setState(newState: EnemyState, currentTime: number) {
    if (newState !== this.state) {
      this.previousState = this.state;
      this.state = newState;
      this.lastStateChangeTime = currentTime;
    }
  }

  private canChangeState(currentTime: number): boolean {
    return currentTime - this.lastStateChangeTime >= STATE_CONFIG.MIN_STATE_DURATION;
  }

  private findSafePosition(playerPosition: THREE.Vector3, obstacles: THREE.Object3D[]): THREE.Vector3 {
    const safeDistance = STATE_CONFIG.DISTANCE_THRESHOLDS.RETREAT_STOP;
    const currentToPlayer = playerPosition.clone().sub(this.position).normalize();
    
    // Try to find a position behind cover
    for (const obstacle of obstacles) {
      if (!(obstacle instanceof THREE.Mesh)) continue;
      
      const obstaclePos = new THREE.Vector3();
      obstacle.getWorldPosition(obstaclePos);
      
      // Check if obstacle is between us and player
      const toObstacle = obstaclePos.clone().sub(this.position);
      if (toObstacle.dot(currentToPlayer) > 0) {
        // Obstacle is in front of us relative to player
        const behindObstacle = obstaclePos.clone().sub(
          currentToPlayer.multiplyScalar(3) // 3 units behind obstacle
        );
        return behindObstacle;
      }
    }
    
    // If no cover found, retreat at an angle
    const retreatAngle = Math.PI / 4; // 45 degrees
    const retreatDir = new THREE.Vector3(
      Math.cos(retreatAngle) * -currentToPlayer.x - Math.sin(retreatAngle) * -currentToPlayer.z,
      0,
      Math.sin(retreatAngle) * -currentToPlayer.x + Math.cos(retreatAngle) * -currentToPlayer.z
    );
    
    return this.position.clone().add(retreatDir.multiplyScalar(safeDistance));
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    obstacles: THREE.Object3D[],
    currentTime: number
  ): { shouldAttack: boolean; targetPosition: THREE.Vector3 } {
    if (this.state === 'dead') return { shouldAttack: false, targetPosition: this.position };

    const stats = ENEMY_STATS[this.type];
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    const canSeePlayer = this.canSeePlayer(playerPosition, obstacles);
    
    // Update position from physics
    const physicsTranslation = this.rigidBody.translation();
    this.position.set(physicsTranslation.x, physicsTranslation.y, physicsTranslation.z);

    let targetPosition = this.position.clone();
    let shouldAttack = false;

    // Calculate if player is approaching
    const prevToPlayer = this.position.clone().sub(playerPosition);
    const playerVelocity = prevToPlayer.length() - distanceToPlayer;
    const isPlayerApproaching = playerVelocity > 0.1;

    if (this.canChangeState(currentTime)) {
      let newState = this.state;

      if (canSeePlayer) {
        if (distanceToPlayer <= STATE_CONFIG.DISTANCE_THRESHOLDS.RETREAT_START && isPlayerApproaching) {
          // Player is rushing us - retreat!
          newState = 'retreating';
        } else if (distanceToPlayer <= STATE_CONFIG.DISTANCE_THRESHOLDS.ATTACK_START) {
          // Alternate between strafing and attacking
          newState = this.state === 'attacking' ? 'strafing' : 'attacking';
        } else if (distanceToPlayer <= STATE_CONFIG.DISTANCE_THRESHOLDS.CHASE_START) {
          newState = 'chasing';
        }
      } else {
        if (this.state !== 'retreating') {
          newState = 'patrolling';
        }
      }

      if (newState !== this.state) {
          this.setState(newState, currentTime);
      }
    }

    switch (this.state) {
      case 'retreating':
        // Find retreat position behind nearest obstacle or at an angle
        const toPlayer = playerPosition.clone().sub(this.position).normalize();
        let retreatDir = toPlayer.clone().negate();
        
        // Try to find cover
        for (const obstacle of obstacles) {
          if (!(obstacle instanceof THREE.Mesh)) continue;
          const obstaclePos = new THREE.Vector3();
          obstacle.getWorldPosition(obstaclePos);
          
          const toObstacle = obstaclePos.clone().sub(this.position);
          if (toObstacle.dot(toPlayer) > 0) {
            // Obstacle is between us and player - use it as cover
            retreatDir = toObstacle.normalize();
            break;
          }
        }
        
        // Add a slight angle to the retreat
        const angle = Math.PI / 4; // 45 degrees
        retreatDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * angle);
        
        targetPosition = this.position.clone().add(
          retreatDir.multiplyScalar(STATE_CONFIG.DISTANCE_THRESHOLDS.RETREAT_STOP)
        );
        
        // Try to shoot while retreating
        if (canSeePlayer && currentTime - this.lastAttackTime >= stats.attackCooldown * 1.5) {
          shouldAttack = true;
          this.lastAttackTime = currentTime;
        }
        break;

      case 'strafing':
        this.strafeTime += delta;
        if (this.strafeTime >= STATE_CONFIG.STRAFE_DURATION) {
          this.strafeTime = 0;
          this.strafeDirection *= -1;
        }

        const playerDir = playerPosition.clone().sub(this.position).normalize();
        const strafeDir = new THREE.Vector3(-playerDir.z, 0, playerDir.x)
          .multiplyScalar(this.strafeDirection * 4);
        
        targetPosition = playerPosition.clone()
          .sub(playerDir.multiplyScalar(STATE_CONFIG.DISTANCE_THRESHOLDS.STRAFE_RANGE))
          .add(strafeDir);

        if (currentTime - this.lastAttackTime >= stats.attackCooldown) {
          shouldAttack = true;
          this.lastAttackTime = currentTime;
        }
        break;

      case 'idle':
        if (canSeePlayer && distanceToPlayer < stats.attackRange * 1.5) {
          this.setState('chasing', currentTime);
        } else if (this.patrolPoints.length > 0) {
          this.setState('patrolling', currentTime);
        }
        break;

      case 'patrolling':
        const currentPatrolPoint = this.patrolPoints[this.currentPatrolIndex];
        const distanceToPatrolPoint = this.position.distanceTo(currentPatrolPoint);
        
        if (distanceToPatrolPoint < 0.5) {
          this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        targetPosition = currentPatrolPoint;
        break;

      case 'chasing':
        if (canSeePlayer) {
          // Calculate position that maintains optimal attack distance
          const dirToPlayer = new THREE.Vector3().subVectors(playerPosition, this.position).normalize();
          targetPosition = playerPosition.clone().sub(
            dirToPlayer.multiplyScalar(STATE_CONFIG.DISTANCE_THRESHOLDS.STRAFE_RANGE)
          );
        }
        break;

      case 'attacking':
        // Stand ground and attack
        if (currentTime - this.lastAttackTime >= stats.attackCooldown) {
          shouldAttack = true;
          this.lastAttackTime = currentTime;
        }
        targetPosition = this.position.clone(); // Stay in place while attacking
        break;
    }

    // Calculate velocity with smoother acceleration
    if (!targetPosition.equals(this.position)) {
      const direction = targetPosition.clone().sub(this.position).normalize();
      const targetVelocity = direction.multiplyScalar(stats.speed);
      
      // Smooth acceleration
      this.velocity.lerp(targetVelocity, delta * 5);
      
      // Apply velocity to rigid body
      this.rigidBody.setLinvel(
        { x: this.velocity.x, y: 0, z: this.velocity.z },
        true
      );
    }

    return { shouldAttack, targetPosition };
  }

  getState(): EnemyState {
    return this.state;
  }

  getHealth(): number {
    return this.health;
  }
} 