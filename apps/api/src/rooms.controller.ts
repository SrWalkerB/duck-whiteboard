import {
  Body,
  Controller,
  HttpCode,
  Post,
  ValidationPipe,
} from '@nestjs/common'
import { IsArray } from 'class-validator'

import { RoomsService } from './rooms.service.js'

class CreateRoomDto {
  @IsArray()
  elements!: unknown[]
}

@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: CreateRoomDto,
  ) {
    const room = await this.rooms.createRoom(body.elements)
    return {
      token: room.token,
      path: `/r/${room.token}`,
    }
  }
}
